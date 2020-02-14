import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import startsWith from 'lodash/startsWith'
import GroupContainer from './containers/GroupContainer';
import Draggable from './containers/Draggable';
import { Icon, Modal } from 'antd';
const { confirm } = Modal;
const classNames = require('classnames');
import Item from './Item';
import {ConjsRadios, ConjsButtons} from './Conjs';
import {GroupActions} from './GroupActions';

const defaultPosition = 'topRight';


export class Group extends PureComponent {
  static propTypes = {
    //tree: PropTypes.instanceOf(Immutable.Map).isRequired,
    treeNodesCnt: PropTypes.number,
    conjunctionOptions: PropTypes.object.isRequired,
    allowFurtherNesting: PropTypes.bool.isRequired,
    isRoot: PropTypes.bool.isRequired,
    not: PropTypes.bool,
    selectedConjunction: PropTypes.string,
    config: PropTypes.object.isRequired,
    id: PropTypes.string.isRequired,
    path: PropTypes.any, //instanceOf(Immutable.List)
    children1: PropTypes.any, //instanceOf(Immutable.OrderedMap)
    isDraggingMe: PropTypes.bool,
    isDraggingTempo: PropTypes.bool,
    //actions
    handleDraggerMouseDown: PropTypes.func,
    onDragStart: PropTypes.func,
    addRule: PropTypes.func.isRequired,
    addGroup: PropTypes.func.isRequired,
    removeSelf: PropTypes.func.isRequired,
    setConjunction: PropTypes.func.isRequired,
    setNot: PropTypes.func.isRequired,
    actions: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.removeSelf = this.removeSelf.bind(this);
  }

  isGroupTopPosition() {
    return startsWith(this.props.config.settings.groupActionsPosition || defaultPosition, 'top')
  }

  removeSelf() {
    const confirmOptions = this.props.config.settings.removeGroupConfirmOptions;
    const doRemove = () => {
      this.props.removeSelf();
    };
    if (confirmOptions && !this.isEmptyCurrentGroup()) {
      confirm({...confirmOptions,
        onOk: doRemove,
        onCancel: null
      });
    } else {
      doRemove();
    }
  }

  isEmptyCurrentGroup() {
    const children = this.props.children1;
    return children.size == 0 ||
      children.size == 1 && this.isEmpty(children.first());
  }

  isEmpty(item) {
    return (item.get("type") == "group" || item.get("type") == "rule_group") ? this.isEmptyGroup(item) : this.isEmptyRule(item);
  }

  isEmptyGroup(group) {
    const children = group.get("children1");
    return children.size == 0 ||
      children.size == 1 && this.isEmpty(children.first());
  }

  isEmptyRule(rule) {
    const properties = rule.get('properties');
      return !(
          properties.get("field") !== null &&
          properties.get("operator") !== null &&
          properties.get("value").filter((val) => val !== undefined).size > 0
      );
  }

  render() {
    return <>
      {this.renderHeaderWrapper()}
      {this.renderChildrenWrapper()}
      {this.renderFooterWrapper()}
    </>;
  }

  renderChildrenWrapper() {
    return this.props.children1 && (
      <div key="group-children" className={classNames(
        "group--children",
        this.props.children1.size < 2 && this.props.config.settings.hideConjForOne ? 'hide--line' : '',
        this.props.children1.size < 2 ? 'one--child' : '',
        this.childrenClassName()
      )}>{this.renderChildren()}</div>
    );
  }

  childrenClassName = () => '';

  renderHeaderWrapper() {
    const isGroupTopPosition = this.isGroupTopPosition();
    return (
      <div key="group-header" className="group--header">
       {this.renderHeader()}
       {isGroupTopPosition && this.renderBeforeActions()}
       {isGroupTopPosition && this.renderActions()}
       {isGroupTopPosition && this.renderAfterActions()}
     </div>
    );
  }

  renderFooterWrapper() {
    const isGroupTopPosition = this.isGroupTopPosition();
    return !isGroupTopPosition && (
      <div key="group-footer" className='group--footer'>
        {this.renderBeforeActions()}
        {this.renderActions()}
        {this.renderAfterActions()}
      </div>
    );
  }

  renderBeforeActions = () => {
    const BeforeActions = this.props.config.settings.renderBeforeActions;
    if (BeforeActions == undefined)
      return null;

    return typeof BeforeActions === 'function' ? <BeforeActions {...this.props}/> : BeforeActions;
  }

  renderAfterActions = () => {
    const AfterActions = this.props.config.settings.renderAfterActions;
    if (AfterActions == undefined)
      return null;

    return typeof AfterActions === 'function' ? <AfterActions {...this.props}/> : AfterActions;
  }

  renderActions() {
    const {config, addRule, addGroup} = this.props;

    return <GroupActions
      config={config}
      addRule={addRule}
      addGroup={addGroup}
      canAddGroup={this.canAddGroup()}
      canAddRule={this.canAddRule()}
      canDeleteGroup={this.canDeleteGroup()}
      removeSelf={this.removeSelf}
    />;
  }

  canAddGroup = () => this.props.allowFurtherNesting;
  canAddRule = () => true;
  canDeleteGroup = () => !this.props.isRoot;

  renderChildren() {
    const {children1} = this.props;
    return children1 ? children1.map(this.renderItem.bind(this)).toList() : null;
  }

  renderItem(item) {
    const props = this.props;
    const {config, actions, onDragStart} = props;
    const isRuleGroup = item.get('type') == 'group' && item.getIn(['properties', 'field']) != null;
    const type = isRuleGroup ? 'rule_group' : item.get('type');
    
    return (
      <Item
        {...this.extraPropsForItem(item)}
        key={item.get('id')}
        id={item.get('id')}
        //path={props.path.push(item.get('id'))}
        path={item.get('path')}
        type={type}
        properties={item.get('properties')}
        config={config}
        actions={actions}
        children1={item.get('children1')}
        //tree={props.tree}
        treeNodesCnt={this.reordableNodesCnt()}
        onDragStart={onDragStart}
      />
    );
  };

  extraPropsForItem(_item) {
    return {};
  }

  reordableNodesCnt() {
    const {treeNodesCnt} = this.props;
    return treeNodesCnt;
  }

  renderDrag() {
    const {
      config, isRoot, treeNodesCnt,
      handleDraggerMouseDown
    } = this.props;
    const reordableNodesCnt = treeNodesCnt;
    const showDragIcon = config.settings.canReorder && !isRoot && reordableNodesCnt > 1;
    const drag = showDragIcon &&
      <span
        key="group-drag-icon"
        className={"qb-drag-handler group--drag-handler"}
        onMouseDown={handleDraggerMouseDown}
      ><Icon type="bars" /> </span>;
    return drag;
  }

  renderConjs() {
    const {
      config, children1,
      selectedConjunction, setConjunction, conjunctionOptions, not, setNot
    } = this.props;

    const Conjs = config.settings.renderConjsAsRadios ? ConjsRadios : ConjsButtons;
    const conjs = <Conjs
      disabled={children1.size < 2}
      selectedConjunction={selectedConjunction}
      setConjunction={setConjunction}
      conjunctionOptions={conjunctionOptions}
      config={config}
      not={not}
      setNot={setNot}
    />;
    return conjs;
  }

  renderHeader() {
    return (
      <div className={classNames(
        "group--conjunctions",
        // children1.size < 2 && config.settings.hideConjForOne ? 'hide--conj' : ''
      )}>
        {this.renderConjs()}
        {this.renderDrag()}
      </div>
    );
  }
}

export default GroupContainer(Draggable("group")(Group));